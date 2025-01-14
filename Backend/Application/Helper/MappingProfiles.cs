using Application.DTO.Create;
using AutoMapper;
using Domain;

namespace Application.Helper;

public class MappingProfiles : Profile
{
    public MappingProfiles()
    {
        CreateMap<TestCreateDTO, Test>();
    }
}